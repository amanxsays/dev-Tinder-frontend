import { Bounce, ToastContainer } from "react-toastify";

export const Toast = () => {
  return (
    <ToastContainer
      position="bottom-right"
      autoClose={2000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick={false}
      rtl={false}
      pauseOnFocusLoss={false}
      theme="dark"
      transition={Bounce}
    />
  );
};
