import { useEffect, useRef } from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import './HomeServices.css'

const services = [
  { key: 'records', image: 'records', width: 1440, height: 2160 },
  { key: 'vaccinations', image: 'vaccination', width: 960, height: 1440 },
  { key: 'growth', image: 'growth', width: 1440, height: 960 },
  { key: 'appointments', image: 'clinic', width: 1440, height: 960 },
]

export default function HomeServices({ scrollRoot, active }) {
  const { t } = useLanguage()
  const container = useRef(null)

  useEffect(() => {
    if (!active || !scrollRoot.current || !window.IntersectionObserver) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (preference.matches) return
    const sections = [...container.current.querySelectorAll('.home-service')]
    const showAll = () => sections.forEach(section => section.removeAttribute('data-reveal'))
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.removeAttribute('data-reveal')
        observer.unobserve(entry.target)
      })
    }, { root: scrollRoot.current, threshold: 0.12 })
    // The markup is visible by default. Only prepare offscreen sections for reveals.
    const bottom = scrollRoot.current.getBoundingClientRect().bottom
    sections.forEach(section => {
      if (section.getBoundingClientRect().top >= bottom - 40) section.dataset.reveal = 'pending'
      observer.observe(section)
    })
    const updateMotion = () => {
      if (preference.matches) { observer.disconnect(); showAll() }
    }
    preference.addEventListener('change', updateMotion)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', updateMotion)
      showAll()
    }
  }, [active, scrollRoot])

  return <div ref={container} className="home-services">
    <header className="home-services__intro">
      <span className="nomu-home__eyebrow"><span aria-hidden="true" />{t('home.careEyebrow')}</span>
      <h2 id="home-care-title">{t('home.careTitle')}</h2>
      <p>{t('home.careIntro')}</p>
    </header>
    {services.map(({ key, image, width, height }, index) => <section
      key={key}
      className={`home-service home-service--${key}${index % 2 ? ' home-service--reverse' : ''}`}
      aria-labelledby={`home-service-${key}`}
    >
      <div className="home-service__text">
        <span className="home-service__number" aria-hidden="true">0{index + 1}<span /></span>
        <h2 id={`home-service-${key}`}>{t(`home.services.${key}.title`)}<span className="home-service__heading-line" aria-hidden="true" /></h2>
        <p>{t(`home.services.${key}.description`)}</p>
      </div>
      <figure className="home-service__image" data-parallax>
        <div className="home-service__mask"><img src={`${import.meta.env.BASE_URL}images/home/${image}.jpg`} alt={t(`home.services.${key}.alt`)} width={width} height={height} loading="lazy" decoding="async" /></div>
        <svg className="home-service__stroke" viewBox="0 0 500 400" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d={key === 'growth' ? 'M35 355C130 355 130 280 210 270S340 160 460 40' : key === 'appointments' ? 'M415 20V65M465 20V65M400 45H480V125H400ZM400 75H480M420 93H430M450 93H460' : 'M485 385V140Q485 15 360 15H15'} /></svg>
      </figure>
    </section>)}
    <div className="home-services__journey" aria-hidden="true"><span /></div>
  </div>
}
