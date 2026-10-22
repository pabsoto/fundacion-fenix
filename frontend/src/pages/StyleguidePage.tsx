import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Logo } from '@/components/ui/Logo';
import { Photo } from '@/components/ui/Photo';
import { Pill } from '@/components/ui/Pill';
import { SectionBand } from '@/components/ui/SectionBand';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { FlameIcon, PawIcon } from '@/components/ui/icons';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export function StyleguidePage() {
  return (
    <div className="min-h-screen bg-crema p-8">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="mb-8 t-hero text-negro">Styleguide</h1>

        {/* Colors */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Color Palette</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <div className="mb-2 h-24 rounded-card bg-crema border border-linea" />
              <p className="t-small text-negro">Crema</p>
              <p className="t-small text-negro opacity-60">#fefbf6</p>
            </div>
            <div>
              <div className="mb-2 h-24 rounded-card bg-crema-tono border border-linea" />
              <p className="t-small text-negro">Crema Tono</p>
              <p className="t-small text-negro opacity-60">#f4f1ea</p>
            </div>
            <div>
              <div className="mb-2 h-24 rounded-card bg-negro" />
              <p className="t-small text-negro">Negro</p>
              <p className="t-small text-negro opacity-60">#1c1c1c</p>
            </div>
            <div>
              <div className="mb-2 h-24 rounded-card bg-naranja" />
              <p className="t-small text-negro">Naranja</p>
              <p className="t-small text-negro opacity-60">#ff5402</p>
            </div>
            <div>
              <div className="mb-2 h-24 rounded-card bg-naranja-hover" />
              <p className="t-small text-negro">Naranja Hover</p>
              <p className="t-small text-negro opacity-60">#ff9700</p>
            </div>
            <div>
              <div className="mb-2 h-24 rounded-card bg-amarillo" />
              <p className="t-small text-negro">Amarillo</p>
              <p className="t-small text-negro opacity-60">#ffc200</p>
            </div>
            <div>
              <div className="mb-2 h-24 rounded-card bg-blanco border border-linea" />
              <p className="t-small text-negro">Blanco</p>
              <p className="t-small text-negro opacity-60">#ffffff</p>
            </div>
            <div>
              <div className="mb-2 h-24 rounded-card bg-linea" />
              <p className="t-small text-negro">Línea</p>
              <p className="t-small text-negro opacity-60">rgba(28,28,28,0.15)</p>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Typography Scale</h2>
          <div className="space-y-4">
            <div>
              <p className="t-hero text-negro">Hero (68px)</p>
              <p className="t-small text-negro opacity-60">clamp(2.75rem, 4vw + 1.25rem, 4.25rem)</p>
            </div>
            <div>
              <p className="t-section text-negro">Section (56px)</p>
              <p className="t-small text-negro opacity-60">clamp(2.25rem, 3.5vw + 1rem, 3.5rem)</p>
            </div>
            <div>
              <p className="t-stat-xl text-naranja">Stat XL (112px)</p>
              <p className="t-small text-negro opacity-60">clamp(4.5rem, 8vw, 7rem)</p>
            </div>
            <div>
              <p className="t-stat text-naranja">Stat (56px)</p>
              <p className="t-small text-negro opacity-60">clamp(2.5rem, 4vw, 3.5rem)</p>
            </div>
            <div>
              <p className="t-heading-lg text-negro">Heading LG (36px)</p>
              <p className="t-small text-negro opacity-60">clamp(1.75rem, 2.4vw + 0.75rem, 2.25rem)</p>
            </div>
            <div>
              <p className="t-heading-md text-negro">Heading MD (28px)</p>
              <p className="t-small text-negro opacity-60">clamp(1.5rem, 1.8vw, 1.75rem)</p>
            </div>
            <div>
              <p className="t-heading-card text-negro">Heading Card (24px)</p>
              <p className="t-small text-negro opacity-60">1.5rem</p>
            </div>
            <div>
              <p className="t-body-lg text-negro">Body LG (19px)</p>
              <p className="t-small text-negro opacity-60">1.1875rem</p>
            </div>
            <div>
              <p className="t-body text-negro">Body (16px)</p>
              <p className="t-small text-negro opacity-60">1rem</p>
            </div>
            <div>
              <p className="t-body-strong text-negro">Body Strong (16px)</p>
              <p className="t-small text-negro opacity-60">1rem</p>
            </div>
            <div>
              <p className="t-small text-negro">Small (14px)</p>
              <p className="t-small text-negro opacity-60">0.875rem</p>
            </div>
            <div>
              <p className="t-nav text-negro">Nav (15px)</p>
              <p className="t-small text-negro opacity-60">0.9375rem</p>
            </div>
            <div>
              <p className="t-button text-negro">Button (16px)</p>
              <p className="t-small text-negro opacity-60">1rem</p>
            </div>
            <div>
              <p className="t-eyebrow text-negro">EYEBROW (13px)</p>
              <p className="t-small text-negro opacity-60">0.8125rem</p>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" size="md">
              Primary MD
            </Button>
            <Button variant="primary" size="lg">
              Primary LG
            </Button>
            <Button variant="secondary" size="md">
              Secondary MD
            </Button>
            <Button variant="secondary" size="lg">
              Secondary LG
            </Button>
            <Button variant="dark" size="md">
              Dark MD
            </Button>
            <Button variant="dark" size="lg">
              Dark LG
            </Button>
          </div>
        </section>

        {/* Chips */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Chips</h2>
          <div className="flex flex-wrap gap-4">
            <Chip>Fundación sin fines de lucro · La Paz, Bolivia</Chip>
            <Chip variant="solid-crema">Solid Crema</Chip>
          </div>
        </section>

        {/* Pill */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Pill</h2>
          <Pill>Pill on photo</Pill>
        </section>

        {/* Cards */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Cards</h2>
          <div className="flex flex-wrap gap-4">
            <Card radius="card" className="p-6">
              <p className="t-body text-negro">Card radius</p>
            </Card>
            <Card radius="panel" className="p-6">
              <p className="t-body text-negro">Panel radius</p>
            </Card>
            <Card radius="card" elevated="soft" className="p-6">
              <p className="t-body text-negro">Soft shadow</p>
            </Card>
            <Card radius="card" elevated="lift" className="p-6">
              <p className="t-body text-negro">Lift shadow</p>
            </Card>
          </div>
        </section>

        {/* Photo */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Photo</h2>
          <div className="flex flex-wrap gap-4">
            <Photo alt="Test image" src="/images/hero-perros.jpg" className="h-48 w-48" />
            <Photo alt="Missing image" className="h-48 w-48" />
          </div>
        </section>

        {/* SectionHeader */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Section Header</h2>
          <SectionHeader
            title="Section Title"
            subtitle="This is a subtitle that provides additional context about the section."
            eyebrow="EYEBROW"
          />
        </section>

        {/* SectionBand */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Section Band</h2>
          <SectionBand tone="crema">
            <p className="t-body text-negro">Crema tone</p>
          </SectionBand>
          <SectionBand tone="tono">
            <p className="t-body text-negro">Tono tone</p>
          </SectionBand>
          <SectionBand tone="tono" decor>
            <p className="t-body text-negro">Tono tone with decor</p>
          </SectionBand>
        </section>

        {/* IconButton */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Icon Button</h2>
          <div className="flex gap-4">
            <IconButton>
              <ArrowLeft className="h-5 w-5" />
            </IconButton>
            <IconButton>
              <ArrowRight className="h-5 w-5" />
            </IconButton>
          </div>
        </section>

        {/* Logo */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Logo</h2>
          <Logo />
        </section>

        {/* LanguageToggle */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Language Toggle</h2>
          <LanguageToggle />
        </section>

        {/* Icons */}
        <section className="mb-12">
          <h2 className="mb-4 t-section text-negro">Custom Icons</h2>
          <div className="flex gap-4">
            <PawIcon className="h-12 w-12 text-negro" />
            <FlameIcon className="h-12 w-12" />
          </div>
        </section>
      </div>
    </div>
  );
}

