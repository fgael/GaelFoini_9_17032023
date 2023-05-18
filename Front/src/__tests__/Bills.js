/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store.js";
import { bills } from "../fixtures/bills.js";
import router from "../app/Router.js";

jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  let root;
  let bill;
  let store;

  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));

    root = document.createElement("div");
    root.setAttribute("id", "root");
    document.body.append(root);

    router();

    // navigating to the bills page
    window.onNavigate(ROUTES_PATH.Bills);
    store = mockStore;
    bill = new Bills({ document, onNavigate, store, localStorage });
  });

  // clear DOM after each test
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      // wait for the window icon to be displayed in DOM
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      // expecting the window icon to have the "active-icon" class
      expect(windowIcon.classList.contains("active-icon")).toBeTruthy();
    });

    test("Then bills should be ordered from earliest to latest", () => {
      // rendering the BillsUI component with the bills data
      document.body.innerHTML = BillsUI({ data: bills });
      // extracting the dates from the rendered component
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerText);
      // sorting the dates in reverse chronological order
      const antiChrono = (a, b) => (a < b ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);

      // expecting the dates to be sorted in reverse chronological order
      expect(dates).toEqual(datesSorted);
    });
  });

  describe("When I click on new bill", () => {
    test("Then I should be redirect to new bill", async () => {
      store = null;
      // wait for the new bill button to be displayed in DOM
      await waitFor(() => screen.getByTestId("btn-new-bill"));
      const newBillBtn = screen.getByTestId("btn-new-bill");
      // expecting the new bill button to have the btn-primary class
      expect(newBillBtn.classList.contains("btn-primary")).toBeTruthy();

      const handleClickNewBill = jest.fn(bill.handleClickNewBill);

      newBillBtn.addEventListener("click", handleClickNewBill);
      // simulate click on new bill button
      userEvent.click(newBillBtn);

      // expecting hanndleClickNewBill function to have been called
      expect(handleClickNewBill).toHaveBeenCalled();
      // expecting to be on new bill page
      expect(screen.getByText("Envoyer une note de frais")).toBeTruthy();
    });
  });

  describe("When I click on eye icon", () => {
    test("Then a modal should open", async () => {
      document.body.innerHTML = BillsUI({ data: bills });

      const handleClickIconEye = jest.fn((icon) =>
        bill.handleClickIconEye(icon)
      );
      const iconEye = screen.getAllByTestId("icon-eye");
      const modale = screen.getByTestId("modale");
      // mocking jQuery modal function to add show class to the modal element
      $.fn.modal = jest.fn(() => modale.classList.add("show"));
      iconEye.forEach((icon) => {
        icon.addEventListener("click", handleClickIconEye(icon));
        userEvent.click(icon);
        expect(handleClickIconEye).toHaveBeenCalled();
      });
      // expecting the modal to have show class
      expect(modale.getAttribute("class")).toContain("show");
    });
  });

  // integration test for GET request
  describe("When I navigate to Bills Page", () => {
    test("fetches bills from mock API GET", async () => {
      document.body.innerHTML = BillsUI({ data: bills });

      // waiting to be on bills page
      await waitFor(() => screen.getByText("Mes notes de frais"));
      
      const newBillBtn = screen.getByTestId("btn-new-bill");
      // expecting the new bill button to be present in the DOM
      expect(newBillBtn).toBeTruthy();

      const data = await bill.getBills();
      // expecting the fetched data to have a length of 4
      expect(data.length).toBe(4);
    });
  });

  describe("When an error occurs on API", () => {
    beforeEach(() => {
      jest.spyOn(mockStore, "bills");
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });

      root = document.createElement("div");
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
      const message = screen.getByText(/Erreur 404/);
      // expecting error 404 to be displayed in DOM
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
      const message = screen.getByText(/Erreur 500/);
      // expecting error 500 to be displayed in DOM
      expect(message).toBeTruthy();
    });
  });
});
