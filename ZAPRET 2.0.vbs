Set UAC = CreateObject("Shell.Application")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)

portableExe = strDir & "\dist\ZAPRET-2.0-Portable\ZAPRET-2.0.exe"
electronExe = strDir & "\node_modules\electron\dist\electron.exe"

If fso.FileExists(portableExe) Then
    UAC.ShellExecute portableExe, "", strDir & "\dist\ZAPRET-2.0-Portable", "runas", 1
ElseIf fso.FileExists(electronExe) Then
    UAC.ShellExecute electronExe, Chr(34) & strDir & Chr(34), strDir, "runas", 1
Else
    UAC.ShellExecute "powershell.exe", "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""Set-Location '" & strDir & "'; npm start""", strDir, "runas", 0
End If
