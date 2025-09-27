
import dotenv from "dotenv"
import app from "./src/app"

// Configuring dotenv
dotenv.config()

// Getting the PORT from environment variables
const PORT = process.env.PORT || 3000

// Starting the server
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`)
})
