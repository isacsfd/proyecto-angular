import cv2
import time
import http.client
import json
import socket  # Para manejar errores de conexión específicos

def leer_qr_con_delay():
    """
    Lee códigos QR de la cámara usando OpenCV,
    envía el DNI a una API local y respeta un delay entre lecturas procesadas.
    """
    cap = cv2.VideoCapture(0)  # Intenta usar la cámara por defecto

    # Verifica si la cámara se abrió correctamente
    if not cap.isOpened():
        print("FATAL: No se pudo abrir la cámara. Verifica que esté conectada y no en uso.")
        return  # Termina el script si no hay cámara

    # Configuraciones
    delay_entre_lecturas = 5  # Segundos de espera entre lecturas procesadas
    api_host = "127.0.0.1"
    api_port = 8000
    api_endpoint = "/api/library-access/"  # Asegúrate que coincide con tu router FastAPI
    connection_timeout = 10  # Segundos de espera para la conexión y respuesta de la API

    # Estado
    ultima_lectura_procesada = 0  # Tiempo UNIX de la última lectura enviada a la API
    ultimo_dato_leido = None  # Guarda el último DNI leído para evitar spam si se mantiene el mismo QR

    # Detector de QR de OpenCV
    detector = cv2.QRCodeDetector()

    print("+" + "-"*60 + "+")
    print("| Lector QR Iniciado".ljust(60) + "|")
    print(f"| - API Host: {api_host}:{api_port}".ljust(60) + "|")
    print(f"| - API Endpoint: {api_endpoint}".ljust(60) + "|")
    print(f"| - Delay entre lecturas: {delay_entre_lecturas} segundos".ljust(60) + "|")
    print("+" + "-"*60 + "+")
    print("Presiona 'q' en la ventana de la cámara para salir.")

    while True:
        ret, frame = cap.read()

        if not ret or frame is None:
            print("Advertencia: No se pudo capturar frame. Intentando de nuevo...")
            time.sleep(0.5)
            continue

        # Detecta y decodifica QR
        datos, bbox, _ = detector.detectAndDecode(frame)
        tiempo_actual = time.time()

        if datos:
            # Elimina ceros no significativos
            datos = datos.lstrip("0")

            if datos:
                tiempo_desde_ultima = tiempo_actual - ultima_lectura_procesada

                if tiempo_desde_ultima > delay_entre_lecturas or datos != ultimo_dato_leido:
                    print(f"\n--- [{time.strftime('%H:%M:%S')}] Detectado QR: {datos} ---")

                    conn = None
                    try:
                        print(f"Intentando conectar a {api_host}:{api_port}...")
                        conn = http.client.HTTPConnection(api_host, api_port, timeout=connection_timeout)

                        payload = json.dumps({"dni": datos})
                        headers = {'Content-Type': 'application/json', 'Accept': 'application/json'}

                        print(f"Enviando POST a {api_endpoint} con DNI: {datos}")
                        conn.request("POST", api_endpoint, payload, headers)

                        res = conn.getresponse()
                        respuesta_status = res.status
                        respuesta_reason = res.reason
                        respuesta_body = res.read()

                        print(f"Respuesta API: Status={respuesta_status}, Reason={respuesta_reason}")
                        try:
                            respuesta_texto = respuesta_body.decode('utf-8')
                            print(f"Respuesta API (raw): {respuesta_texto}")
                        except UnicodeDecodeError:
                            print(f"Respuesta API (no decodificable): {respuesta_body}")

                        if 200 <= respuesta_status < 300:
                            print(f"INFO: QR {datos} procesado exitosamente por la API.")
                            ultima_lectura_procesada = tiempo_actual
                            ultimo_dato_leido = datos
                            print(f"-> Esperando {delay_entre_lecturas}s para la próxima lectura...")
                        else:
                            print(f"ERROR API: No se pudo procesar DNI {datos}. Status: {respuesta_status}")

                    except socket.timeout:
                        print(f"ERROR RED: Timeout ({connection_timeout}s) - La API no respondió a tiempo.")
                    except ConnectionRefusedError:
                        print(f"ERROR RED: Conexión rechazada. Verifica que la API esté corriendo en {api_host}:{api_port}.")
                    except http.client.HTTPException as e:
                        print(f"ERROR HTTP: Ocurrió un error durante la conexión/solicitud: {e}")
                    except json.JSONDecodeError:
                        print("ERROR CODIGO: No se pudo crear el payload JSON (revisar el script).")
                    except Exception as e:
                        print(f"ERROR INESPERADO: {type(e).__name__} - {e}")
                    finally:
                        if conn:
                            conn.close()

            # Dibujar el bounding box en la imagen
            if bbox is not None:
                pts = bbox.astype(int).reshape(-1, 2)
                for i in range(len(pts)):
                    cv2.line(frame, tuple(pts[i]), tuple(pts[(i+1) % len(pts)]), (0, 255, 0), 2)
                cv2.putText(frame, datos, (pts[0][0], pts[0][1]-10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        cv2.imshow("Lector QR IUB (Presiona 'q' para salir)", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\nSaliendo del lector QR...")
            break

    print("Liberando cámara y cerrando ventanas.")
    cap.release()
    cv2.destroyAllWindows()
    print("Lector QR terminado.")

if __name__ == "__main__":
    leer_qr_con_delay()
