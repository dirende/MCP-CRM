export declare const CustomPagination: (props: {
    rowsPerPage: number;
    page: number;
    count: number;
    onPageChange?: any;
    onRowsPerPageChange?: any;
    rowsPerPageOptions: (number | {
        label: string;
        value: number;
    })[];
}) => JSX.Element;
