export class CreateTenantDto {
  name?: string;
  rutNit?: string;
  ticketPaperSize?: string;
  ticketAutoPrint?: boolean;
  ticketHeaderMessage?: string;
  ticketFooterMessage?: string;
  address?: string;
  phone?: string;
  location?: string;
}
