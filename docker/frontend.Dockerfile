FROM node:20-alpine
WORKDIR /app
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm install
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
