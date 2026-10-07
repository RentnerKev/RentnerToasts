export type ToastTextToken =
    | { kind: 'text'; value: string }
    | { kind: 'link'; value: string; href: string; offset: number }
