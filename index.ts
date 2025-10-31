import dotenv from "dotenv"
// Configuring dotenv
dotenv.config()
import app from "./src/app"



// Getting the PORT from environment variables
const PORT = process.env.PORT || 3000

// Starting the server
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${PORT}`)
})
