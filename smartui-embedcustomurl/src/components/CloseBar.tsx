import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box/Box";
import IconButton from "@mui/material/IconButton/IconButton";
import Typography from "@mui/material/Typography/Typography";
import React, { MouseEventHandler } from "react";
import {colord, extend} from "colord";
import namesPlugin from "colord/plugins/names";
extend([namesPlugin])

export const CloseBar = ({ title, backgroundColor = "white", color, onClose }: { title: string, backgroundColor?: string, color?: string; onClose?: MouseEventHandler<HTMLButtonElement>}) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    document.getElementById("pureFrame")?.focus();
    if (onClose) onClose(event)
  };

  const textColor = color? color : colord(backgroundColor).invert().toHex();

  return (
    <Box className="toolbar no-padding" style={{ backgroundColor, display: "flex", flex: 1, textAlign: "center", top: 0, position: "sticky", zIndex: 2, maxHeight: "fit-content"}} >        
        <IconButton
          size="small"
          disabled={true}
          style={{ marginLeft: "5px", padding: "3px", color: textColor, height: "fit-content", width: "fit-content", alignSelf: "center", opacity: 0 }}
        >
          <CloseIcon sx={{ fontSize: "18px" }} />
        </IconButton>
        <Typography
          variant="h6"
          style={{
            fontSize: "16px",
            display: "flex",
            flexGrow: 2,
            color: textColor,
            alignItems: "center",
            justifyContent: "center"
          }}
          component="p"
        >
          {title}
        </Typography>
        <IconButton
          size="small"
          style={{ marginRight: "5px", padding: "3px", color: textColor, height: "fit-content", width: "fit-content", alignSelf: "center" }}
          aria-label="close"
          onClick={handleClick}
          sx={{ "&:hover": { backgroundColor: "red", color: "white !important" } }}
        >
          <CloseIcon sx={{ fontSize: "18px" }} />
        </IconButton>
    </Box>
  );
}
