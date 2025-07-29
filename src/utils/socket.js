import {io} from "socket.io-client";
import { BASE_URL } from "./constants";

export const createSocketConnection=()=>{
    if(location.hostname==="localhost") return io(BASE_URL);// THIS WILL ONLY WORK FOR developemnt
    else return io("/",{ path:"/api/socket.io"})
}