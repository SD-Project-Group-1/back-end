const readline = require("readline");
const prisma = require("./config/db");
const { generateSalt, getHashedPassword } = require("./helpers/encryption");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const prompt = (message) =>
  new Promise((res, _rej) =>
    rl.question(message, (response) => {
      res(response);
      rl.pause();
    })
  );
async function main() {
  const email = await prompt("Enter user email: ");
  const password = await prompt("Enter password: ");
  const first_name = await prompt("First name: ");
  const last_name = await prompt("Last name: ");
  const role = await prompt("What is this users role? (staff/management): ");

  if (!email || !password || !first_name || !last_name) {
    console.error("Missing fields!");
    return;
  }

  const existingAdmin = await prisma.admin.findFirst({
    where: { email },
  });

  if (existingAdmin) {
    console.error("That admin already exists!");
    return;
  }

  const salt = generateSalt();
  const hash = getHashedPassword(password, salt);

  try {
    await prisma.admin.create({
      data: {
        email,
        hash,
        salt,
        first_name,
        last_name,
        role,
      },
    });

    console.log("New admin created!");
  } catch (err) {
    console.error("Failed to create new admin!");
    console.error(err);
  }
}

main().finally(rl?.close);
