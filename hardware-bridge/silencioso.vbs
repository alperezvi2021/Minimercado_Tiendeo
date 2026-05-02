Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtenemos la ruta correcta de la carpeta actual de forma segura
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath

' Ejecutamos el agente oculto (0 = ventana invisible)
WshShell.Run "node index.js", 0, False

Set WshShell = Nothing
Set fso = Nothing
