@echo off
echo.
echo ========================================
echo  Arc Marketplace - Setup Environment
echo ========================================
echo.
echo ATENCAO: Use uma carteira de TESTE!
echo NAO use sua carteira principal!
echo.
echo Pressione CTRL+C para cancelar
echo ou qualquer tecla para continuar...
pause > nul
echo.
set /p PRIVATE_KEY="Cole sua PRIVATE KEY (sem 0x): "
echo.
echo Criando arquivo .env...
echo PRIVATE_KEY=%PRIVATE_KEY% > .env
echo ARC_TESTNET_RPC=https://rpc.testnet.arc.network >> .env
echo.
echo ✅ Arquivo .env criado com sucesso!
echo.
echo Proximos passos:
echo 1. npm run compile
echo 2. npm run deploy
echo 3. Atualizar frontend/src/config/contracts.js
echo.
pause

