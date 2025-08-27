import Image from "next/image";
import clsx from "clsx";

export function LandingFeature({
  title,
  description,
  imageSrc,
  reverse = false,
}: {
  title: string;
  description: string;
  imageSrc: string;
  reverse?: boolean;
}) {
  return (
    <section
      className={clsx(
        "flex flex-col md:flex-row items-center justify-between gap-10 pt-12 pb-24 px-12",
        reverse && "md:flex-row-reverse",
      )}
    >
      <div className="md:w-1/3">
        <h2 className="text-3xl font-bold mb-4 text-zinc-400">{title}</h2>
        <p className="text-l text-zinc-500">{description}</p>
      </div>
      <div className="md:w-1/2 flex justify-center">
        <div className="h-[500px] w-[300px] overflow-hidden rounded-lg shadow-xl outline outline-2 outline-blue-950">
          <Image
            src={imageSrc}
            alt={title}
            width={300}
            height={300}
            className="-translate-y-[50px]"
          />
        </div>
      </div>
    </section>
  );
}
