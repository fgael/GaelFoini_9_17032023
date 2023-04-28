/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";

import BillsUI from "../views/BillsUI.js"
import Bills from "../containers/Bills.js"

import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

import mockStore from "../__mocks__/store.js";

import { bills } from "../fixtures/bills.js"

import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });

      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();

      window.onNavigate(ROUTES_PATH.Bills);

      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon.classList.contains("active-icon")).toBeTruthy();
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerText);
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);

      expect(dates).toEqual(datesSorted);
    });
  });

  describe("When I click on new bill", () => {
    test("Then I should be redirect to new bill", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });

      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      document.body.innerHTML = BillsUI({ data: bills });

      const bill = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage,
      });

      await waitFor(() => screen.getByTestId("btn-new-bill"));
      const newBillBtn = screen.getByTestId("btn-new-bill");
      expect(newBillBtn.classList.contains("btn-primary")).toBeTruthy();

      const handleClickNewBill = jest.fn(bill.handleClickNewBill);
      newBillBtn.addEventListener("click", handleClickNewBill);
      userEvent.click(newBillBtn);

      expect(handleClickNewBill).toHaveBeenCalled();
      expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();
    });
  });

  describe("When I click on eye icon", () => {
    test("Then a modal should open", async () => {

      Object.defineProperty(window, "localStorage", { value: localStorageMock });

      window.localStorage.setItem("user", JSON.stringify({
        type: "Employee"
      }));

      document.body.innerHTML = BillsUI({ data: bills });

      const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname });
      };

      const store = null
      const bill = new Bills({
        document, onNavigate, store, bills, localStorage: window.localStorage
      });

      const handleClickIconEye = jest.fn(bill.handleClickIconEye)
      const eyeIcon = screen.getAllByTestId("icon-eye");

      eyeIcon.forEach(icon => {
        icon.addEventListener('click', () => handleClickIconEye(icon))
      })

      userEvent.click(eyeIcon[0]);
      expect(handleClickIconEye).toHaveBeenCalled();

      const modale = document.getElementById("modaleFile");
      expect(modale).toBeTruthy();
    })
  })

  // test d'intégration GET
  describe("When I navigate to Bills Page", () => {
    test("fetches bills from mock API GET", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });

      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };

      document.body.innerHTML = BillsUI({ data: bills });

      const bill = new Bills({
        document,
        onNavigate,
        store: mockStore,
        localStorage,
      });

      await waitFor(() => screen.getByText("Mes notes de frais"));

      const newBillBtn = screen.getByTestId("btn-new-bill");
      expect(newBillBtn).toBeTruthy();

      const data = await bill.getBills();
      expect(data.length).toBe(4);
    });
  });

  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Admin",
          email: "a@a",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.appendChild(root);
      router();
    });

    test("fetches bills from an API and fails with 404 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"));
          },
        };
      });

      window.onNavigate(ROUTES_PATH.Dashboard);
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 404/);
      expect(message).toBeTruthy();
    });

    test("fetches messages from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 500"));
          },
        };
      });

      window.onNavigate(ROUTES_PATH.Dashboard);
      await new Promise(process.nextTick);
      const message = await screen.getByText(/Erreur 500/);
      expect(message).toBeTruthy();
    });
  });
})
