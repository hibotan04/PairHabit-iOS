const fs = require("fs");
const path = require("path");

const pbxprojPath = path.join(__dirname, "..", "ios", "PairHabit.xcodeproj", "project.pbxproj");

if (fs.existsSync(pbxprojPath)) {
  let s = fs.readFileSync(pbxprojPath, "utf8");
  if (s.includes("objectVersion = 70;")) {
    s = s.replace(/objectVersion = 70;/g, "objectVersion = 56;");
    fs.writeFileSync(pbxprojPath, s, "utf8");
    console.log("✅ Patched objectVersion: 70 -> 56");
  } else {
    console.log("ℹ️ objectVersion is not 70, skipping patch.");
  }
} else {
  console.log("⚠️ project.pbxproj not found at " + pbxprojPath);
}
