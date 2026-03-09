import { TableBody, TableFooter, TableHead } from "@mui/material";
import './customTable.css';
export declare const CustomTable: (props: {
    TableHead?: JSX.Element[][];
    TableBody?: JSX.Element[][] | undefined | null;
    TableFooter?: JSX.Element[][] | undefined | null;
    disableFooter?: boolean | undefined | null;
    errorMessage?: string;
    defaultRowPerPage?: number;
}) => JSX.Element;
