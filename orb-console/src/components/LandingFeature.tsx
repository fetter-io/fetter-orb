import clsx from "clsx";
import { ImageLightbox } from "@/components/ImageLightbox";

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
        "flex flex-col md:flex-row items-center justify-between pt-10 pb-10 px-12",
        reverse && "md:flex-row-reverse",
      )}
    >
      <div className="md:w-1/3">
        <h2 className="text-3xl font-bold mb-2 text-zinc-400">{title}</h2>
        <p className="text-l text-zinc-500">{description}</p>
      </div>
      <div className="md:w-1/2 flex justify-center">
        <div className="">
          <ImageLightbox
            src={imageSrc}
            alt={title}
            width={600}
            height={400}
            className=""
          />
        </div>
      </div>
    </section>
  );
}
