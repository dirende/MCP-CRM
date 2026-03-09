import Search from "@mui/icons-material/Search";
import Typography from "@mui/material/Typography";
import { Stack } from "@mui/system";
import React from "react";

export const MessageIcon = (props: { title?: string, icon?: React.ReactElement, color?: string }) => {
  const {title="No Element Found...", icon= <Search/>, color = "#999999"} = props;
  return(
    <Stack
      className="message-icon"
      width={"100%"}
      height={"100%"}
      bgcolor={"white"}
      style={{ justifyContent: "center", alignItems: "center" }}
    >
      {React.cloneElement(icon, {sx: {fontSize: 100, color}})}
      <Typography variant="h6" sx={{ color, textAlign: "center", fontWeight: "bolder", padding: "10px" }}>
        {title}
      </Typography>
    </Stack>
  )
}