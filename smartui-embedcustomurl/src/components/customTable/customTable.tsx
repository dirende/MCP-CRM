import { Table, TableBody, TableCell, TableFooter, TableHead, TableRow } from "@mui/material";
import React from "react";
import { CustomMessage } from "../CustomMessage";
import './customTable.css'
import { Search } from "@mui/icons-material";
import { CustomPagination } from "./customTablePagination";

const tableRow = (values: JSX.Element[], key: number = 0, type: string) =>
    <TableRow key={key + "_row"} className={"row_" + type}>{values.length > 0 ? values.map((value, index) => tableCell(value, index, type, key)) : []}</TableRow>

const tableCell = (value: any, key: number = 0, type: string, parentKey: number = 0) =>
    <TableCell key={key + "_col"} className={"col_" + type + (parentKey===0?(" first_col_" + type):(" next_col_" + type))}>{value}</TableCell>

export const CustomTable = (props: { TableHead?: JSX.Element[][]; TableBody?: JSX.Element[][] | undefined | null;  TableFooter?: JSX.Element[][] | undefined | null; disableFooter?: boolean | undefined | null; errorMessage?: string; defaultRowPerPage?: number }) => {  
    const [page, setPage] = React.useState(0);
    const rowsPerPageOptions = [5, 10, 25, 50, 100, { label: 'All', value: -1 }];
    const controlledRowPerPage = props.defaultRowPerPage && (rowsPerPageOptions.includes(props.defaultRowPerPage) || props.defaultRowPerPage === -1) ? props.defaultRowPerPage : rowsPerPageOptions[0] as number
    const [rowsPerPage, setRowsPerPage] = React.useState(controlledRowPerPage);
    const isEmptyHead = (props.TableHead?.length || 0) === 0;
    const isEmptyBody = (props.TableBody?.length || 0) === 0;    
    const isEmptyFooter = (props.TableFooter?.length || 0) === 0;
    const isDisabledPaginationFooter = (props.disableFooter || (props.TableBody?.length || 0) < (rowsPerPageOptions[0] as number));
    const isDisabledFooter = isDisabledPaginationFooter && isEmptyFooter;

    const handleChangePage = (
        event: React.MouseEvent<HTMLButtonElement> | null,
        newPage: number,
    ) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Table className="table">
            {
                !isEmptyHead ? 
                    <TableHead className="table-head">
                        { props.TableHead!.map((row: any, key: number) => tableRow(row, key, "head")) }
                    </TableHead>
                    : null
            }            
            <TableBody className="table-body">
                {
                    !isEmptyBody ?
                        (rowsPerPage > 0
                            ? props.TableBody!.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            : props.TableBody!
                        ).map((row: any, key: number) => tableRow(row, key, "body")) :
                        tableRow([<CustomMessage title = {props.errorMessage || "No Element Found..."} element={<Search sx={{ fontSize: 100, color: "#999999" }} />}/>], 0, "body")
                }
            </TableBody>
            {
                !isDisabledFooter ?
                    <TableFooter className="table-footer">
                        {[
                            !isEmptyFooter?props.TableFooter!.map((row: any, key: number) => tableRow(row, key, "head")): null,
                            !isDisabledPaginationFooter ?<CustomPagination key="pagination" count={props.TableBody!.length!} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={rowsPerPageOptions}/>: null
                        ].filter(Boolean)}                        
                    </TableFooter> :
                    null
            }
        </Table>
    );
}