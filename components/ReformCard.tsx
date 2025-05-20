import { motion } from 'framer-motion';

const ReformCard = ({ title, description, icon }) => (
  <motion.div
    className="group relative cursor-pointer overflow-hidden bg-white rounded-2xl px-6 pt-12 pb-10 shadow-2xl ring-1 ring-gray-900/5 transition-all duration-500 transform hover:scale-105 hover:shadow-3xl sm:mx-auto sm:max-w-sm sm:px-12"
    whileHover={{ scale: 1.05 }}
  >
    <span className="absolute top-0 left-0 z-0 h-32 w-32 rounded-full bg-gradient-to-r from-green-500 to-green-700 opacity-75 transition-all duration-500 transform group-hover:scale-[20]"></span>
    <div className="relative z-10 mx-auto max-w-md text-center">
      <span className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-r from-green-500 to-green-700 transition-all duration-500 transform group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-teal-500">
        {icon}
      </span>
      <div className="space-y-6 pt-6 text-lg leading-8 text-gray-700 transition-all duration-500 group-hover:text-white">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="font-medium">{description}</p>
      </div>
    </div>
  </motion.div>
);

export default ReformCard;
