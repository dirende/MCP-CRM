import Typography from "@mui/material/Typography";
import { Stack } from "@mui/system";
import React from "react";

export const CustomMessage = (props: { title: string, element: JSX.Element }) =>
  <Stack
    className="message-icon"
    width={"100%"}
    height={"100%"}
    style={{ justifyContent: "center", alignItems: "center" }}
  >
    {props.element}
    <Typography variant="h6" sx={{ color: "#999999", textAlign: "center", fontWeight: "bolder", padding: "10px" }}>
      {props.title}
    </Typography>
  </Stack>
