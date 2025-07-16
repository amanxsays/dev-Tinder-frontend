import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./userSlice"
import feedReducer from "./feedSlice"
import connectionReducer from "./connectionsSlice"

const appStore = configureStore({
    reducer:{
        user: userReducer,
        feed: feedReducer,
        connection: connectionReducer,
    }
});

export default appStore;
