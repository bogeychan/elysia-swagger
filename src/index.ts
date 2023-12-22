/* eslint-disable @typescript-eslint/ban-ts-comment */
import { type Elysia, type InternalRoute } from 'elysia'

import { filterPaths, registerSchemaPath } from './utils'

import type { OpenAPIV3 } from 'openapi-types'
import type { ReferenceConfiguration } from '@scalar/api-reference'
import type { ElysiaSwaggerConfig } from './types'
import { SwaggerUIRender } from './swagger-ui'
import { ScalarRender } from './scalar'

/**
 * Plugin for [elysia](https://github.com/elysiajs/elysia) that auto-generate Swagger page.
 *
 * @see https://github.com/elysiajs/elysia-swagger
 */
export const swagger =
    <Path extends string = '/swagger'>(
        {
            provider = 'scalar',
            scalarVersion = '1.12.5',
            scalarConfig = {},
            documentation = {},
            version = '5.9.0',
            excludeStaticFile = true,
            path = '/swagger' as Path,
            exclude = [],
            swaggerOptions = {},
            theme = `https://unpkg.com/swagger-ui-dist@${version}/swagger-ui.css`,
            autoDarkMode = true
        }: ElysiaSwaggerConfig<Path> = {
            provider: 'scalar',
            scalarVersion: '1.12.5',
            scalarConfig: {},
            documentation: {},
            version: '5.9.0',
            excludeStaticFile: true,
            path: '/swagger' as Path,
            exclude: [],
            swaggerOptions: {},
            autoDarkMode: true
        }
    ) =>
    (app: Elysia) => {
        const schema = {}
        let totalRoutes = 0

        if (!version)
            version = `https://unpkg.com/swagger-ui-dist@${version}/swagger-ui.css`

        const info = {
            title: 'Elysia Documentation',
            description: 'Development documentation',
            version: '0.0.0',
            ...documentation.info
        }

        const relativePath = path.startsWith('/') ? path.slice(1) : path

        app.get(path, () => {
            const combinedSwaggerOptions = {
                url: `${relativePath}/json`,
                dom_id: '#swagger-ui',
                ...swaggerOptions
            }
            const stringifiedSwaggerOptions = JSON.stringify(
                combinedSwaggerOptions,
                (key, value) => {
                    if (typeof value == 'function') {
                        return undefined
                    } else {
                        return value
                    }
                }
            )

            const scalarConfiguration: ReferenceConfiguration = {
                spec: {
                    url: `${relativePath}/json`
                },
                ...scalarConfig
            }


            return new Response(provider === 'swagger-ui' ? SwaggerUIRender(info, version, theme, stringifiedSwaggerOptions, autoDarkMode) : ScalarRender(scalarVersion, scalarConfiguration),
                {
                    headers: {
                        'content-type': 'text/html; charset=utf8'
                    }
                }
            )
        }).get(`${path}/json`, () => {
            const routes = app.routes as InternalRoute[]

            if (routes.length !== totalRoutes) {
                totalRoutes = routes.length

                routes.forEach((route: InternalRoute) => {
                    registerSchemaPath({
                        schema,
                        hook: route.hooks,
                        method: route.method,
                        path: route.path,
                        // @ts-ignore
                        models: app.definitions?.type,
                        contentType: route.hooks.type
                    })
                })
            }

            return {
                openapi: '3.0.3',
                ...{
                    ...documentation,
                    info: {
                        title: 'Elysia Documentation',
                        description: 'Development documentation',
                        version: '0.0.0',
                        ...documentation.info
                    }
                },
                paths: filterPaths(schema, {
                    excludeStaticFile,
                    exclude: Array.isArray(exclude) ? exclude : [exclude]
                }),
                components: {
                    ...documentation.components,
                    schemas: {
                        // @ts-ignore
                        ...app.definitions?.type,
                        ...documentation.components?.schemas
                    }
                }
            } satisfies OpenAPIV3.Document
        })

        // This is intentional to prevent deeply nested type
        return app
    }

export default swagger
