import { CustomerIntel } from '../models/interfaces/params';
interface Props {
    data: CustomerIntel | null;
    loading: boolean;
    error: string | null;
    contactInfo: string;
    mediaType: string;
}
export declare const CustomerIntelCard: ({ data, loading, error, contactInfo, mediaType }: Props) => import("react/jsx-runtime").JSX.Element;
export {};
