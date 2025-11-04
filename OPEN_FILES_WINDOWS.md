# How to Open Files on Windows

## The "code" Command Not Found

If you see this error:
```
code : The term 'code' is not recognized...
```

It means VS Code is not in your PATH. Here are alternatives:

---

## Method 1: Use Notepad (Built-in)
```powershell
notepad START_HERE.md
```

---

## Method 2: Use Windows Default Program
```powershell
# This opens with whatever program is associated with .md files
Start-Process START_HERE.md
```

Or:
```powershell
ii START_HERE.md
```
(ii is alias for Invoke-Item)

---

## Method 3: Open in File Explorer
```powershell
# Open file explorer in current directory
explorer .

# Then double-click START_HERE.md
```

---

## Method 4: Read in PowerShell (No Editor)
```powershell
# Display in terminal
Get-Content START_HERE.md | more

# Or shorter:
cat START_HERE.md | more
```

---

## Method 5: Fix VS Code PATH (Optional)

If you want to use `code` command in the future:

### Option A: Reinstall VS Code with PATH
1. Open VS Code installer
2. Check "Add to PATH" option
3. Reinstall

### Option B: Add VS Code to PATH manually
```powershell
# Find VS Code location (usually):
$vscodePath = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\bin"

# Add to PATH for current session
$env:PATH += ";$vscodePath"

# Test it
code --version
```

To make it permanent:
1. Press `Win + X` → System
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "User variables", select "Path"
5. Click "Edit" → "New"
6. Add: `C:\Users\YOUR_USERNAME\AppData\Local\Programs\Microsoft VS Code\bin`
7. Click OK, restart PowerShell

---

## Recommended for Now

**Just use Notepad:**
```powershell
notepad START_HERE.md
```

It's simple and always works!

---

## Quick Reference

```powershell
# Open with Notepad
notepad START_HERE.md

# Open with default program
ii START_HERE.md

# Read in terminal
cat START_HERE.md | more

# Open folder in explorer
explorer .
```
