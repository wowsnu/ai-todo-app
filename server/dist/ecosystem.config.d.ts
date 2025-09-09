export let apps: ({
    name: string;
    script: string;
    cwd: string;
    instances: number;
    exec_mode: string;
    env: {
        NODE_ENV: string;
        PORT: number;
    };
    error_file: string;
    out_file: string;
    log_file: string;
    time: boolean;
    max_memory_restart: string;
    node_args: string;
    args?: undefined;
} | {
    name: string;
    script: string;
    args: string;
    instances: number;
    exec_mode: string;
    env: {
        NODE_ENV: string;
        PORT?: undefined;
    };
    error_file: string;
    out_file: string;
    log_file: string;
    time: boolean;
    cwd?: undefined;
    max_memory_restart?: undefined;
    node_args?: undefined;
})[];
//# sourceMappingURL=ecosystem.config.d.ts.map