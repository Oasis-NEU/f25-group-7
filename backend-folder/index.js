const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Express on Windows!');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
