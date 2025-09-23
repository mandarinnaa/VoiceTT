package io.ionic.starter;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.tchvu3.capacitorvoicerecorder.VoiceRecorder;

public class MainActivity extends BridgeActivity {
    
    private static final int PERMISSION_REQUEST_CODE = 1001;
    
    // Permisos necesarios
    private String[] requiredPermissions = {
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.MODIFY_AUDIO_SETTINGS,
        Manifest.permission.INTERNET,
        Manifest.permission.ACCESS_NETWORK_STATE
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Registrar el plugin
        registerPlugin(VoiceRecorder.class);
        
        // Solicitar permisos
        requestPermissionsIfNeeded();
    }

    private void requestPermissionsIfNeeded() {
        // Verificar qué permisos faltan
        java.util.List<String> permissionsToRequest = new java.util.ArrayList<>();
        
        for (String permission : requiredPermissions) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(permission);
            }
        }
        
        // Agregar permisos específicos para versiones de Android más recientes
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            String mediaAudioPermission = Manifest.permission.READ_MEDIA_AUDIO;
            if (ContextCompat.checkSelfPermission(this, mediaAudioPermission) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(mediaAudioPermission);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String storagePermission = Manifest.permission.WRITE_EXTERNAL_STORAGE;
            if (ContextCompat.checkSelfPermission(this, storagePermission) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(storagePermission);
            }
        }

        // Solicitar permisos si es necesario
        if (!permissionsToRequest.isEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                permissionsToRequest.toArray(new String[0]),
                PERMISSION_REQUEST_CODE
            );
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allPermissionsGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allPermissionsGranted = false;
                    break;
                }
            }
            
            if (!allPermissionsGranted) {
                // Manejar el caso cuando no se conceden todos los permisos
                // Puedes mostrar un diálogo explicativo o deshabilitar funcionalidades
                System.out.println("Algunos permisos no fueron concedidos. La funcionalidad puede verse limitada.");
            }
        }
    }
}