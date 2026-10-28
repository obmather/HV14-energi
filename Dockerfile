FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG HV14_APP
ARG HV14_DATA_MODE=api
RUN test "$HV14_APP" = water || test "$HV14_APP" = energy
ENV VITE_HV14_APP=$HV14_APP
ENV VITE_HV14_DATA_MODE=$HV14_DATA_MODE
ENV VITE_HV14_API_BASE_URL=""
ENV NITRO_PRESET=node-server
RUN bun run build

FROM node:22-alpine AS runtime
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]