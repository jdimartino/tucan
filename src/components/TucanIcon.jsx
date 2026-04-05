import tucanImg from '../assets/tucan.png'

export default function TucanIcon({ className = "" }) {
    return (
        <img
            src={tucanImg}
            alt="Tucán"
            className={className}
            draggable={false}
        />
    )
}
