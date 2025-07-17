declare module "ejs-browser" {
  export interface Options {
    strict?: boolean;
    escape?: (str: string) => string;
    filename?: string;
    cache?: boolean;
    delimiter?: string;
    _with?: boolean;
    includer?: any;
  }

  export function render(template: string, data?: any, options?: Options): string;
  export function compile(template: string, options?: Options): (data?: any) => string;
}
