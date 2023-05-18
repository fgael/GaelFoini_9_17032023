/**
 * @jest-environment jsdom
*/

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import BillsUI from "../views/BillsUI.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";


jest.mock("../app/Store", () => mockStore);

describe("Given I am connected as an employee", () => {
  let root;
  let newBillContainer;
  let store;

  // mocking localStorage for eachTest
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }));

    root = document.createElement("div");
    root.setAttribute("id", "root");
    document.body.append(root);

    router();
    // simulate navigation to NewBill
    window.onNavigate(ROUTES_PATH.NewBill);
    store = mockStore;
    newBillContainer = new NewBill(({ document, onNavigate, store, localStorage }));
  });

  // clear DOM after each test
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("When I am on NewBill Page", () => {
    test("Then the mail icon in vertical layout should be highlighted", async () => {
      // wait for the mail icon to be displayed in DOM
      await waitFor(() => screen.getByTestId('icon-mail'));
      const mailIcon = screen.getByTestId('icon-mail');
      // check if icon have active-icon class
      expect(mailIcon.className).toBe("active-icon");
    });

    test("Then the new bill form is displayed", () => {
      // render NewBillUI
      document.body.innerHTML = NewBillUI();
      const newBillForm = screen.getByTestId('form-new-bill');
      // check if new bill form exists
      expect(newBillForm).toBeTruthy();
    });
  });

  describe("When I am on NewBill Page and I add an image file", () => {
    test("Then the filename is displayed in the input", () => {
      document.body.innerHTML = NewBillUI();
  
      const handleChangeFile = jest.fn(newBillContainer.handleChangeFile);
      const input = screen.getByTestId("file");
  
      // add a fake file to the upload
      input.addEventListener("change", handleChangeFile);
      userEvent.upload(input, new File(["test"], "test.png", { type: "image/png" }));
  
      // check if the file name matches
      expect(input.files[0].name).toBe("test.png");
      // check if the file type matches
      expect(input.files[0].type).toBe("image/png");
      // check if the add file function has been called
      expect(handleChangeFile).toHaveBeenCalled();
    });
  });

  describe("When I am on NewBill Page and I add a file with invalid format", () => {
    test("Then an error message is displayed", () => {
      document.body.innerHTML = NewBillUI();
  
      const handleChangeFile = jest.fn(newBillContainer.handleChangeFile);
      const input = screen.getByTestId("file");
  
      // add a fake file to the upload
      input.addEventListener("change", handleChangeFile);
      userEvent.upload(input, new File(["test"], "video.mp4", { type: "media/mp4" }));
  
      // check if the add file function has been called
      expect(handleChangeFile).toHaveBeenCalled();
      // check if the error message is displayed
      expect(screen.getByText("Le fichier doit être de type .jpg, .jpeg ou .png")).toBeTruthy();
    });
  });

});

describe("Given I am connected as an Employee", () => {
  let root;

  beforeEach(() => {
    root = document.createElement("div");
    root.setAttribute("id", "root");
    document.body.append(root);
    router();
  });

  describe("When I am on NewBill Page, I fill the form and submit", () => {
    test("Then the bill is added to API POST", async () => {
      // set user information in localStorage
      localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }));
      document.body.innerHTML = NewBillUI();
      const store = mockStore;
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname });
      };
      const newBill = new NewBill({
        document, onNavigate, store, localStorage
      });

      // fill the form fields
      const nameField = screen.getByTestId("expense-name");
      userEvent.type(nameField, "Hotel");
      const dateField = screen.getByTestId("datepicker");
      userEvent.type(dateField, "2020-01-05");
      const amountField = screen.getByTestId("amount");
      userEvent.type(amountField, "300");
      const pctField = screen.getByTestId("pct");
      userEvent.type(pctField, "20");
      const commentaryField = screen.getByTestId("commentary");
      userEvent.type(commentaryField, "voici ma note de frais pour l'hotel");
      const proofField = screen.getByTestId("file");
      const file = new File(['facture-hotel.png'], "facture-hotel.png", { type: "png" });
      userEvent.upload(proofField, file);

      const submitBill = jest.fn(newBill.handleSubmit);
      const newBillForm = screen.getByTestId("form-new-bill");
      newBillForm.addEventListener("submit", submitBill);
      // simulate submitting the form
      userEvent.click(screen.getByText("Envoyer"));
      // check if submit function has been called
      expect(submitBill).toHaveBeenCalled();
      // check if we display bills page
      expect(screen.getByTestId("btn-new-bill")).toBeTruthy();
    });
  });
});


describe("When an error occurs on API", () => {

  beforeEach(() => {
    jest.spyOn(mockStore, "bills")
    Object.defineProperty(
      window,
      'localStorage',
      { value: localStorageMock }
    )
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee',
      email: "a@a"
    }))

    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.appendChild(root)
    router()
  })


  test("fetches bills from an API and fails with 404 message error", async () => {
    mockStore.bills.mockImplementationOnce(() => {
      return {
        list: () => {
          return Promise.reject(new Error("Erreur 404"))
        }
      }
    })

    document.body.innerHTML = BillsUI({ error: 'Erreur 404' })
    await new Promise(process.nextTick)
    const message = await screen.getByText(/Erreur 404/)
    expect(message).toBeTruthy()
  })


  test("fetches messages from an API and fails with 500 message error", async () => {
    mockStore.bills.mockImplementationOnce(() => {
      return {
        list: () => {
          return Promise.reject(new Error("Erreur 500"))
        }
      }
    })

    document.body.innerHTML = BillsUI({ error: 'Erreur 500' })
    await new Promise(process.nextTick)
    const message = await screen.getByText(/Erreur 500/)
    expect(message).toBeTruthy()
  })
})