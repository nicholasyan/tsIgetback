import * as fs from 'fs';
import * as express from 'express';
import * as security from './security';

type Continuation = (req: express.Request, res: express.Response) => void;

export enum HttpMethod {
    GET,
    POST
};

export function readLines(filePath: string): string[] {
    return fs.readFileSync(filePath).toString().split('\n');
};

export class RouteManager {
    constructor(private app: express.Express) {
    }

    public addRoutes(routes: Route[]): void {
        for (let route of routes) {
            this.addRoute(route);
        }
    }

    public addRoute(route: Route): void {
        let method: (route: string, cont: Continuation) => void;
        switch (route.httpMethod) {
            case HttpMethod.GET: {
                method = this.app.get.bind(this.app);
                break;
            }
            case HttpMethod.POST: {
                method = this.app.post.bind(this.app);
                break;
            }
            default: {
                console.trace('Misconfigured route:', route);
                break;
            }
        }
        method(route.route, (req, res) => {
            const cookie: string = req.headers['cookie'];
            if (route.isSecure && !security.validateCookie(cookie)) {
                if (!route.isAjax) {
                    res.redirect('/login');
                } else {
                    res.status(401).send('not authorized');
                }
            } else {
                route.cont(req, res);
            }
        });
    }
};

export class RouteBuilder {
    public httpMethod?: HttpMethod;
    public isSecure?: boolean;
    public isAjax?: boolean;

    constructor(readonly route: string, readonly cont: Continuation) {}

    setHttpMethod(method: HttpMethod): RouteBuilder {
        this.httpMethod = method;
        return this;
    }

    setIsSecure(isSecure: boolean): RouteBuilder {
        this.isSecure = isSecure;
        return this;
    }

    setIsAjax(isAjax: boolean): RouteBuilder {
        this.isAjax = isAjax;
        return this;
    }
};

export class Route {
    readonly route: string;
    readonly cont: Continuation;
    readonly httpMethod: HttpMethod = HttpMethod.GET;
    readonly isSecure: boolean = false;
    readonly isAjax: boolean = false;

    constructor(routeBuilder: RouteBuilder) {
        if (routeBuilder.httpMethod != null) {
            this.httpMethod = routeBuilder.httpMethod;
        }

        if (routeBuilder.isSecure != null) {
            this.isSecure = routeBuilder.isSecure;
        }

        if (routeBuilder.isAjax != null) {
            this.isAjax = routeBuilder.isAjax;
        }

        this.route = routeBuilder.route;
        this.cont = routeBuilder.cont;
    }
};

interface IGetBackResponse {
    error?: {
        message: string
        error?: any
    },
    data?: any
}

export function badRequest(res: express.Response, message?: any, error?: any): void {
    const errorResponse: IGetBackResponse = {
        error: {
            message: message == null ? 'bad request' : message
        }
    };

    if (error) {
        errorResponse.error = error;
    }

    res.status(400).send(errorResponse);
}
