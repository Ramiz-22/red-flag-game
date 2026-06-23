import { useSocket } from '../../contexts/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConnectionStatus() {
  const { isConnected } = useSocket();

  return (
    <AnimatePresence>
      {!isConnected && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-0 inset-x-0 z-50 bg-red-600/90 text-white text-center text-sm py-2 font-medium backdrop-blur-sm"
        >
          Connection lost. Reconnecting...
        </motion.div>
      )}
    </AnimatePresence>
  );
}
