import { createSlice } from "@reduxjs/toolkit";

const feedSlice=createSlice({
    name:"feed",
    initialState:null,
    reducers:{
        addFeed:( state, action)=> action.payload,
        removeFeed:()=> null,
        removeCard:( state, action)=> state.filter((r)=> r._id!=action.payload),
    }
});

export const {addFeed, removeFeed, removeCard} = feedSlice.actions;
export default feedSlice.reducer;