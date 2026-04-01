import "dotenv/config";
import mongoose from "mongoose";
import { User } from "./src/models/User";

const emailToPromote = process.argv[2];

if (!emailToPromote) {
  console.log("Please provide an email. Example: npx ts-node makeAdmin.ts user@example.com");
  process.exit(1);
}

const promoteUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to DB...");

    const user = await User.findOneAndUpdate(
      { email: emailToPromote },
      { role: "admin" },
      { new: true }
    );

    if (user) {
      console.log(`✅ Success! ${user.name} (${user.email}) is now an Admin!`);
    } else {
      console.log(`❌ User not found with email: ${emailToPromote}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error connecting to DB:", error);
    process.exit(1);
  }
};

promoteUser();
