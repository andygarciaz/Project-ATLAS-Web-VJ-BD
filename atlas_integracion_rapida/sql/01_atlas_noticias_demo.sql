-- SOLO para una base de desarrollo AUTORIZADA. No ejecutar en producción.
-- Verificar primero DB_NAME() y permiso de creación.
SELECT DB_NAME() AS BaseActual;
GO
IF OBJECT_ID(N'dbo.atlas_NoticiasDemo', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.atlas_NoticiasDemo (
    idNoticia INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    titulo NVARCHAR(150) NOT NULL,
    contenido NVARCHAR(2000) NOT NULL,
    fecha DATE NOT NULL,
    publicada BIT NOT NULL CONSTRAINT DF_atlas_NoticiasDemo_publicada DEFAULT (1)
  );
END;
GO
-- Datos ficticios; inserción idempotente para no duplicarlos en pruebas.
IF NOT EXISTS (SELECT 1 FROM dbo.atlas_NoticiasDemo WHERE titulo = N'Bienvenida a Project ATLAS')
BEGIN
  INSERT INTO dbo.atlas_NoticiasDemo (titulo, contenido, fecha, publicada)
  VALUES (N'Bienvenida a Project ATLAS', N'Comunicado ficticio para verificar la integración Web–API–SQL Server.', '20261012', 1);
END;
GO
SELECT idNoticia, titulo, fecha, publicada FROM dbo.atlas_NoticiasDemo;
GO
