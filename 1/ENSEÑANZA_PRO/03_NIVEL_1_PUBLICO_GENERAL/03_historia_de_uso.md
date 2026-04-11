# Historia de Uso del Sistema: un Caso Completo

## Para que sirve esta historia

A veces una arquitectura o una lista de modulos no basta para entender un sistema. Por eso conviene contar una historia de uso realista. Esta historia ayuda a ver como las piezas se conectan.

## Escenario

Imagina que una persona nueva necesita operar dentro del sistema porque debe trabajar con documentos de un area especifica.

## Etapa 1: registro

La persona entra a la plataforma y crea su cuenta.

En ese momento:

- captura sus datos;
- el sistema registra al usuario;
- se genera un proceso de verificacion por correo.

Todavia no significa que ya pueda usar todo el sistema.

## Etapa 2: verificacion

El usuario recibe un codigo y lo valida.

Con eso el sistema confirma que:

- el correo realmente existe;
- la cuenta tiene una capa basica de validacion;
- el flujo puede avanzar.

## Etapa 3: aprobacion administrativa

Dependiendo del flujo del sistema, un administrador revisa el registro.

Aqui puede:

- aprobarlo;
- rechazarlo;
- o revisar si hace falta algo.

Esto evita altas descontroladas.

## Etapa 4: asignacion de permisos y areas

Una vez aprobado, el usuario necesita tener contexto operativo:

- que puede hacer;
- y sobre que areas puede operar.

Si no tiene lo necesario, puede solicitarlo.

## Etapa 5: el usuario entra a trabajar

Ya dentro del sistema, el usuario puede:

- ver su perfil;
- revisar sus permisos;
- consultar documentos a los que tiene acceso;
- o subir un nuevo documento si esta autorizado.

## Etapa 6: carga documental

Supongamos que sube un documento.

El sistema:

- valida permisos;
- valida el archivo;
- guarda la informacion;
- crea una version;
- intenta extraer texto;
- indexa para busqueda;
- y deja rastro en auditoria.

Desde ese momento, el documento ya forma parte del sistema.

## Etapa 7: revision y aprobacion

Si el documento requiere flujo formal:

- se asigna revisor;
- se asigna aprobador;
- se envian decisiones;
- se conserva historial.

Esto permite que el documento no sea solo "subido", sino controlado.

## Etapa 8: consulta y busqueda

Otro usuario con permisos adecuados puede buscar el documento por:

- nombre,
- codigo,
- categoria,
- area,
- o contenido.

Si el PDF era escaneado y el OCR funciono, el texto tambien aparece en la busqueda.

## Etapa 9: nueva version

Si el documento cambia, se puede subir una nueva version.

Eso mantiene:

- continuidad,
- historial,
- trazabilidad.

No se reemplaza sin dejar huella.

## Etapa 10: seguimiento administrativo

Los administradores pueden revisar:

- registros;
- solicitudes;
- areas;
- catalogos;
- auditoria;
- e incluso analitica administrativa si esa funcionalidad esta activa.

## Lo que demuestra esta historia

Esta historia muestra que el sistema no es solo una suma de pantallas. Es un flujo integral donde cada parte depende de otra:

- el registro afecta la autenticacion;
- la autenticacion afecta permisos;
- los permisos afectan documentos;
- los documentos alimentan busqueda;
- el workflow afecta trazabilidad;
- la auditoria deja evidencia de todo.

## Frase util para defensa

Si te piden resumir el sistema mediante un ejemplo, puedes decir:

"Un usuario se registra, verifica su cuenta, es aprobado, recibe permisos y areas, sube documentos, genera versiones, participa en revision y aprobacion, busca contenido y todo queda auditado. Esa secuencia resume el funcionamiento completo del DMS SIG."
