import { loadEnvConfig } from "@next/env";
import { connectMongo } from "../lib/mongodb";
import { User } from "../lib/models/User";
import { Contact } from "../lib/models/Contact";
import { Transaction } from "../lib/models/Transaction";

loadEnvConfig(process.cwd());

const CONTACTS = [
  {
    slug: "yogesh-singh-adhikari",
    name: "Yogesh Singh Adhikari",
    identifierType: "upi" as const,
    identifier: "yogeshsingh.adhikari@paytm",
    initials: "YA",
    avatarColor: "#c4b5fd",
    verified: false,
    starredSuggestion: true,
    sortOrder: 0,
  },
  {
    slug: "yogesh-adhikari",
    name: "Yogesh Adhikari",
    identifierType: "upi" as const,
    identifier: "yogeshadhikari126@okicici",
    initials: "YA",
    avatarColor: "#c4b5fd",
    verified: true,
    starredSuggestion: false,
    sortOrder: 1,
  },
  {
    slug: "arif-khan",
    name: "Arif Khan",
    identifierType: "upi" as const,
    identifier: "arif.khan@ybl",
    initials: "AK",
    avatarColor: "#86efac",
    verified: false,
    starredSuggestion: false,
    sortOrder: 2,
  },
  {
    slug: "rakshita-dahiya",
    name: "Rakshita Dahiya",
    identifierType: "upi" as const,
    identifier: "rakshita.d@oksbi",
    initials: "RD",
    avatarColor: "#f9a8d4",
    verified: false,
    starredSuggestion: false,
    sortOrder: 3,
  },
  {
    slug: "homiee",
    name: "Homiee💗",
    identifierType: "phone" as const,
    identifier: "+91 98765 12340",
    initials: "H",
    avatarColor: "#fde047",
    verified: false,
    starredSuggestion: false,
    sortOrder: 4,
  },
  {
    slug: "deepak",
    name: "Deepak",
    identifierType: "upi" as const,
    identifier: "deepak.sharma@ibl",
    initials: "D",
    avatarColor: "#7dd3fc",
    verified: false,
    starredSuggestion: false,
    sortOrder: 5,
  },
  {
    slug: "ananya-garg",
    name: "Ananya Garg",
    identifierType: "upi" as const,
    identifier: "ananya.garg@axl",
    initials: "AG",
    avatarColor: "#fef08a",
    verified: false,
    starredSuggestion: false,
    sortOrder: 6,
  },
  {
    slug: "snow-sadh",
    name: "Snow Sadh",
    identifierType: "upi" as const,
    identifier: "snow.sadh@paytm",
    initials: "SS",
    avatarColor: "#fde68a",
    verified: false,
    starredSuggestion: false,
    sortOrder: 7,
  },
  {
    slug: "papaa",
    name: "Papaa🌴",
    identifierType: "phone" as const,
    identifier: "+91 98100 22445",
    initials: "P",
    avatarColor: "#86efac",
    verified: false,
    starredSuggestion: false,
    sortOrder: 8,
  },
  {
    slug: "kiran",
    name: "Kiran .",
    identifierType: "upi" as const,
    identifier: "kiran.devi@okaxis",
    initials: "K",
    avatarColor: "#fef08a",
    verified: false,
    starredSuggestion: false,
    sortOrder: 9,
  },
  {
    slug: "hassan-khan",
    name: "Hassan Khan",
    identifierType: "upi" as const,
    identifier: "hassan.khan@ybl",
    initials: "HK",
    avatarColor: "#d8b4fe",
    verified: false,
    starredSuggestion: false,
    sortOrder: 10,
  },
  {
    slug: "mummyy",
    name: "Mummyy👀",
    identifierType: "phone" as const,
    identifier: "+91 6280850762",
    initials: "M",
    avatarColor: "#fbcfe8",
    verified: false,
    starredSuggestion: false,
    sortOrder: 11,
  },
];

async function main() {
  await connectMongo();

  await User.updateOne(
    { email: "demo@paytmai.local" },
    {
      $set: {
        email: "demo@paytmai.local",
        displayName: "Paytmai User",
        phone: "+91 98765 43210",
      },
    },
    { upsert: true },
  );

  const user = await User.findOne({ email: "demo@paytmai.local" }).exec();
  if (!user) throw new Error("Demo user missing after upsert");

  for (const c of CONTACTS) {
    await Contact.updateOne(
      { slug: c.slug },
      {
        $set: {
          ...c,
          avatarImageUrl: null,
        },
      },
      { upsert: true },
    );
  }

  const yogesh = await Contact.findOne({ slug: "yogesh-adhikari" }).exec();
  const mummyy = await Contact.findOne({ slug: "mummyy" }).exec();
  if (yogesh && mummyy) {
    const existing = await Transaction.countDocuments({
      userId: user._id,
      contactId: { $in: [yogesh._id, mummyy._id] },
    }).exec();
    if (existing === 0) {
      await Transaction.insertMany([
        {
          userId: user._id,
          contactId: mummyy._id,
          amount: 20000,
          message: "",
          status: "completed",
          createdAt: new Date("2026-03-27T10:30:00.000Z"),
        },
        {
          userId: user._id,
          contactId: yogesh._id,
          amount: 30,
          message: "",
          status: "completed",
          createdAt: new Date("2026-03-23T14:00:00.000Z"),
        },
      ]);
    }
  }

  console.log("Seeded user demo@paytmai.local, 12 contacts, sample transactions.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
