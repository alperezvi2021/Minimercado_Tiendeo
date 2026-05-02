Set WshShell = CreateObject("WScript.Shell")
strPath = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptPosition)
WshShell.CurrentDirectory = strPath
' Ejecutamos el agente oculto. El 0 al final oculta la ventana.
WshShell.Run "node index.js", 0, False
Set WshShell = Nothing
