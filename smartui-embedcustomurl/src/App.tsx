import React, { useEffect, useCallback, useRef } from 'react';
import { IFrame } from './components/iframe';
import { Params } from './models/interfaces/params';
import { CloseBar } from './components/CloseBar';
import { MessageIcon } from './components/MessageIcon';
import { Stack } from '@mui/material';

function App(props: {params: Params, id: string}) {
    const doc = useRef(document);

    const handleOpen = useCallback(()=>{
        if (props.params?.onOpen){
            props.params.onOpen(props.params);
        }
    }, [props.params]);

    useEffect(()=>{
        let curr = doc.current;
        let loaded = false;
        if(!loaded){
            handleOpen();
        }

        curr.getElementById("btn-"+props.id)?.addEventListener("click", handleOpen);
        return () => {
            loaded = true;
            curr.getElementById("btn-"+props.id)?.removeEventListener("click", handleOpen);
        }
    }, [handleOpen, props.id])
  
    if(!props.params) return <MessageIcon title="No params"/>;    

    return <Stack height={"100%"} width={"100%"} direction={"column"} spacing={0} justifyContent={"flex-start"} overflow={"hidden"}>
        {props.params.headerHidden ? undefined : <CloseBar title={props.params.title || 'Embedded Custom URL'} backgroundColor={props.params.headerColor || "white"} color={props.params.headerTextColor || "black"} onClose={props.params?.onClose}/>}
        <Stack flex={1} overflow={"hidden"} direction={"column"} justifyContent={"flex-start"}>
            <IFrame  {...props}/>
        </Stack>
    </Stack>
}
export default App;