"use client";
import { motion } from "framer-motion";
import Image from "next/image";

const About = () => {
  return (
    <>
      {/* <!-- ===== About Start ===== --> */}
      <section className="overflow-hidden pb-20 lg:pb-25 xl:pb-30">
        <div className="mx-auto max-w-c-1235 px-4 md:px-8 xl:px-0">
          <div className="flex items-center gap-8 lg:gap-32.5">
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 },
              }}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="animate_left relative mx-auto hidden aspect-[588/526.5] md:block md:w-1/2"
            >
              <Image
                src="/images/about/about-light-01.png"
                alt="About PEBEC"
                className="dark:hidden"
                fill
              />
              <Image
                src="/images/about/about-dark-01.png"
                alt="About PEBEC"
                className="hidden dark:block"
                fill
              />
            </motion.div>
            <motion.div
              variants={{
                hidden: { opacity: 0, x: 20 },
                visible: { opacity: 1, x: 0 },
              }}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="animate_right md:w-1/2"
            >
              <span className="font-medium uppercase text-black dark:text-white">
                <span className="mb-4 mr-4 inline-flex rounded-full bg-meta px-4.5 py-1 text-metatitle uppercase text-white">
                  PEBEC
                </span>{" "}
                Nigeria’s Ease of Doing Business Intervention
              </span>
              <h2 className="relative mb-6 text-3xl font-bold text-black dark:text-white xl:text-hero">
                Creating a Business-Friendly{" "}
                <span className="relative inline-block before:absolute before:bottom-2.5 before:left-0 before:-z-1 before:h-3 before:w-full before:bg-titlebg dark:before:bg-titlebgdark">
                  Nigeria
                </span>
              </h2>
              <p>
                Micro, small, and medium enterprises (MSMEs) represent over 90% of businesses in Nigeria, contributing nearly 50% to GDP and employing 84% of the workforce. However, bureaucratic bottlenecks hinder their full potential.
              </p>
              <p className="mt-3">
                Established in 2016 and chaired by Vice President Kashim Shettima, PEBEC is committed to removing constraints to doing business and improving Nigeria’s global business perception.
              </p>
            </motion.div>
          </div>
        </div>
      </section>
      {/* <!-- ===== About End ===== --> */}

      {/* <!-- ===== About Two Start ===== --> */}
      <section>
        <div className="mx-auto max-w-c-1235 overflow-hidden px-4 md:px-8 2xl:px-0">
          <div className="flex items-center gap-8 lg:gap-32.5">
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 },
              }}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 1, delay: 0.1 }}
              viewport={{ once: true }}
              className="animate_left md:w-1/2"
            >
              <h4 className="font-medium uppercase text-black dark:text-white">
                Reforming Nigeria’s Business Environment
              </h4>
              <h2 className="relative mb-6 text-3xl font-bold text-black dark:text-white xl:text-hero">
                Advancing Business Reforms for{" "}
                <span className="relative inline-block before:absolute before:bottom-2.5 before:left-0 before:-z-1 before:h-3 before:w-full before:bg-titlebg2 dark:before:bg-titlebgdark">
                  Sustainable Growth
                </span>
              </h2>

              {/* Numbered List of Key Achievements */}
              <div className="mt-7.5 space-y-5">
                {/* Point 1 */}
                <div className="flex items-center gap-5">
                  <div className="flex h-15 w-15 items-center justify-center rounded-[50%] border border-stroke dark:border-strokedark dark:bg-blacksection">
                    <p className="text-metatitle2 font-semibold text-black dark:text-white">
                      01
                    </p>
                  </div>
                  <div className="w-3/4">
                    <h3 className="mb-0.5 text-metatitle2 text-black dark:text-white">
                      Ease of Doing Business Index (DBI)
                    </h3>
                    <p>
                      PEBEC's model aligns with global best practices and includes a strong performance tracking system.
                    </p>
                  </div>
                </div>

                {/* Point 2
                <div className="flex items-center gap-5">
                  <div className="flex h-15 w-15 items-center justify-center rounded-[50%] border border-stroke dark:border-strokedark dark:bg-blacksection">
                    <p className="text-metatitle2 font-semibold text-black dark:text-white">
                      02
                    </p>
                  </div>
                  <div className="w-3/4">
                    <h3 className="mb-0.5 text-metatitle2 text-black dark:text-white">
                      World Bank Recognition
                    </h3>
                    <p>
                      Nigeria moved 39 places in the World Bank’s Doing Business ranking between 2016–2019.
                    </p>
                  </div>
                </div> */}

                {/* Point 3 */}
                <div className="flex items-center gap-5">
                  <div className="flex h-15 w-15 items-center justify-center rounded-[50%] border border-stroke dark:border-strokedark dark:bg-blacksection">
                    <p className="text-metatitle2 font-semibold text-black dark:text-white">
                      02
                    </p>
                  </div>
                  <div className="w-3/4">
                    <h3 className="mb-0.5 text-metatitle2 text-black dark:text-white">
                      Global Competitiveness
                    </h3>
                    <p>
                      The World Economic Forum recognized Nigeria’s business climate as highly entrepreneurial.
                    </p>
                  </div>
                </div>

                {/* Point 4 */}
                <div className="flex items-center gap-5">
                  <div className="flex h-15 w-15 items-center justify-center rounded-[50%] border border-stroke dark:border-strokedark dark:bg-blacksection">
                    <p className="text-metatitle2 font-semibold text-black dark:text-white">
                      03
                    </p>
                  </div>
                  <div className="w-3/4">
                    <h3 className="mb-0.5 text-metatitle2 text-black dark:text-white">
                      Over 200 Business Reforms
                    </h3>
                    <p>
                      More than 180 business climate reforms have improved processes across 36 Nigerian states and FCT.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, x: 20 },
                visible: { opacity: 1, x: 0 },
              }}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 1, delay: 0.1 }}
              viewport={{ once: true }}
              className="animate_right relative mx-auto hidden md:block md:w-[48%] lg:w-[46%] xl:w-[44%] h-auto"
              >
         <Image
  src="/images/business_reforms.jpg"
  alt="PEBEC Reforms"
  className="dark:hidden object-cover rounded-lg"
  layout="responsive"
  width={588}
  height={526}
/>
<Image
  src="/images/business_reforms.jpg"
  alt="PEBEC Reforms"
  className="hidden dark:block object-cover rounded-lg"
  layout="responsive"
  width={588}
  height={526}
/>

            </motion.div>
          </div>
        </div>
      </section>

      
    </>
  );
};

export default About;
