import { Params } from './models/interfaces/params';
interface AppProps {
    ctiMessage: CtiMessage | undefined;
    params: Params;
    id: string;
}
/**
 * App — root component of the MCP-CRM SmartUI widget.
 *
 * Rendered inside the Genesys PEF when a new interaction arrives.
 * Coordinates three data hooks and renders the card-based UI.
 *
 * Props:
 *  - ctiMessage: the active CTI event (undefined = no active interaction)
 *  - params:     configuration injected by the PEF host (backendUrl, title, etc.)
 *  - id:         DOM element ID where the widget is mounted
 */
declare function App({ ctiMessage, params, id }: AppProps): import("react/jsx-runtime").JSX.Element;
export default App;
