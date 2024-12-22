export interface ToolResponse {
  _meta?: {
    progressToken?: string | number;
  };
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}
