import { createSlice } from "@reduxjs/toolkit";

const requestsSlice=createSlice({
    name:"request",
    initialState:null,
    reducers:{
        addRequests:(state, action)=> action.payload,
        removeRequest:(state, action)=>{
            const newState= state.filter((r) => r.fromUserId._id != action.payload);
            return newState;
        },
        removeAllRequests:() => null
    }
})

export const {addRequests , removeRequest, removeAllRequests}= requestsSlice.actions;
export default requestsSlice.reducer;