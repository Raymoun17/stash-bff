export type CurrentUser = {
    id: string;
    username: string;
};

export type AppBindings = {
    Variables: {
        user: CurrentUser;
    };
};
