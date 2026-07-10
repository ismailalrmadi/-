const fs = require('fs');
let data = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

data.entities.AppUser = {
  "title": "AppUser",
  "description": "System user",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "phone": { "type": "string" },
    "password": { "type": "string" },
    "role": { "type": "string" },
    "status": { "type": "string" },
    "lastActive": { "type": "string" }
  },
  "required": ["id", "name", "phone", "role", "status", "lastActive"]
};

data.firestore["/users/{userId}"] = {
  "schema": { "$ref": "#/entities/AppUser" },
  "description": "System users"
};

fs.writeFileSync('firebase-blueprint.json', JSON.stringify(data, null, 2));
