/* eslint-disable react-hooks/exhaustive-deps */
import TablePagination from "@mui/material/TablePagination/TablePagination";
import TableRow from "@mui/material/TableRow/TableRow";
import React, { useEffect } from "react";

export const CustomPagination = (props: {rowsPerPage: number, page: number, count: number, onPageChange?: any, onRowsPerPageChange?: any, rowsPerPageOptions: (number | { label: string; value: number; })[]}) => {
    const {rowsPerPage, page, count, onRowsPerPageChange, onPageChange} = props;

    useEffect(()=>{        
        if(count>0 && page>count-1) onPageChange(undefined, count-1);
        else if(count===0 && page>count) onPageChange(undefined, count);
    },[count]);

    return (
        <TableRow key={"0_row"} className={"row_footer"}>
            <TablePagination
                size="small"
                rowsPerPageOptions={props.rowsPerPageOptions}
                count={count || 0}
                rowsPerPage={rowsPerPage}
                page={page>=count?(count===0?count:count-1):page}
                onPageChange={onPageChange}
                onRowsPerPageChange={onRowsPerPageChange}
                labelRowsPerPage="Rows:"
                labelDisplayedRows={({ page }) => { return `Page ${page+1} of ${Math.ceil((count || 0)/Math.abs(rowsPerPage===-1?count:rowsPerPage))}`; }}
                backIconButtonProps={{
                    sx:{padding: "0px", marginRight: "2px", color: "#1976d2"}
                }}
                nextIconButtonProps={{
                    sx:{padding: "0px", marginLeft: "2px", color: "#1976d2"}
                }}
                sx={{
                    "& .MuiToolbar-root": {
                        paddingLeft: "0px !important",
                        paddingRight: "0px !important",
                        alignSelf: "start",
                        display: "flex",
                        width: "100%",
                        minHeight: "0px"
                    },
                    "& .MuiToolbar-root p, & .MuiToolbar-root div, & .MuiToolbar-root input": {
                        margin: "0px",
                        fontSize: "12px"
                    },
                    "& .MuiTablePagination-spacer": {
                        flex: 1,
                        order: 4,
                    },
                    "& .MuiToolbar-root .MuiTablePagination-displayedRows": {
                        flex: 4,
                        textAlign: "center",
                        order: 3,
                        color: "#212121"
                    },
                    "& .MuiToolbar-root .MuiTablePagination-actions": {
                        flex: 3,
                        textAlign: "end",                        
                        order: 5
                    },
                    "& .MuiToolbar-root .MuiInputBase-root": {
                        flex: 2,                        
                        order: 2,
                        outline: "2px solid #1976d2",
                        borderRadius: "2px",
                        color: "#212121",
                        alignItems: "center"
                    },
                    "& .MuiToolbar-root .MuiInputBase-root, & .MuiToolbar-root .MuiInputBase-root .MuiSelect-select:focus": {
                        background: "#fff"
                    },
                    "& .MuiToolbar-root .MuiInputBase-root .MuiSelect-select": {
                        padding: "0px 20px 0px 5px",
                        textAlign: "left",
                        textAlignLast: "left",
                        alignItems: "center"
                    },
                    "& .MuiToolbar-root .MuiTablePagination-selectLabel": {
                        flex: 2,
                        order: 1,
                        color: "#212121"
                    },
                }}
            />
        </TableRow>
)
}