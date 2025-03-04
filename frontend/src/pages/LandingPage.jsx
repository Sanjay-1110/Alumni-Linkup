import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const features = [
  {
    title: 'Network & Connect',
    description: 'Connect with alumni and professionals from your institution.',
    icon: '🤝',
  },
  {
    title: 'Mentorship',
    description: 'Get guidance from experienced professionals in your field.',
    icon: '🎯',
  },
  {
    title: 'Job Opportunities',
    description: 'Access exclusive job postings and career opportunities.',
    icon: '💼',
  },
  {
    title: 'Collaborate',
    description: 'Work on projects and research with fellow alumni.',
    icon: '🤖',
  },
];

const LandingPage = () => {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white py-20 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="text-center max-w-4xl mx-auto">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 tracking-tight"
            >
              Connect, Collaborate & Grow with{' '}
              <span className="text-primary-600 inline-block">LinkUp</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              The ultimate platform for alumni to network, mentor, and collaborate on
              impactful projects.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6"
            >
              <Link
                to="/register"
                className="px-8 py-4 bg-primary-600 text-white rounded-xl text-lg font-semibold hover:bg-primary-700 transition duration-300 shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 border-2 border-primary-600 text-primary-600 rounded-xl text-lg font-semibold hover:bg-primary-50 transition duration-300"
              >
                Sign In
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
              Everything you need to succeed
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Powerful features to help you grow professionally
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 border border-gray-100"
              >
                <div className="text-5xl mb-6">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-700 text-white py-20 sm:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">
            Ready to get started?
          </h2>
          <p className="text-xl md:text-2xl mb-12 text-primary-100 max-w-2xl mx-auto leading-relaxed">
            Join thousands of alumni already connected on LinkUp
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 bg-white text-primary-600 rounded-xl text-lg font-semibold hover:bg-primary-50 transition duration-300 shadow-lg hover:shadow-xl"
          >
            Join Now
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

export default LandingPage; 