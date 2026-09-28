"""ALC - Automatic Logic Construction v1.1 (ConstruMaster, 28/09/2026).

Misma logica que la pagina (index.js: motorVivienda, calcularProgramacion, herramientasProgramacion),
con las constantes de ALC.json:
  - motor_vivienda(): cantidades de obra a partir del area total, los pisos y los espacios (R001-R005).
  - programacion(): constante de tiempo por categoria, cuadrilla de 2 a 5 personas, rendimiento de
    1,25 m2/dia por espacio y red PERT/CPM por capitulo.
  - mano_de_obra() y herramientas(): costo con el salario minimo y alquiler de equipos por tarea.

Uso:  python alc.py            (ejemplo: tipologia 4, 80 m2)
Nota: en el equipo original no hay Python; la pagina ejecuta la misma logica en JavaScript.
"""
import json
import math
import os
from datetime import date, timedelta

RUTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ALC.json")


def cargar(ruta=RUTA):
    with open(ruta, encoding="utf-8") as f:
        return json.load(f)["ALC"]


# --------------------------------------------------------------------------------------------
# Motor de vivienda
# --------------------------------------------------------------------------------------------
def vivienda_de_tipologia(alc, categoria, area_total=None):
    """Espacios de una tipologia (1 a 4 traen espacios; 5 y 6 se diligencian a mano)."""
    tip = next(t for t in alc["tipologias"] if t["categoria"] == categoria)
    minimo = tip.get("area_minima", tip.get("area_desde", 0))
    v = dict(alc["vivienda"]["variables"])
    v["tipologia"] = categoria
    v["area_total"] = area_total if area_total else minimo
    ventanas = {"bano": (0.6, 0.6)}
    v["espacios"] = {}
    for clave, (cantidad, area) in tip.get("espacios", {}).items():
        an, al = ventanas.get(clave, (1.5, 1.0))
        v["espacios"][clave] = {"n": cantidad, "area": area, "puertas": 1, "ventanas": 1, "an": an, "al": al, "puntos": 3, "op": {}}
    return v


def tipologia_por_area(alc, area):
    t = None
    for x in alc["tipologias"]:
        if area >= x.get("area_minima", x.get("area_desde", 0)):
            t = x
    return t


def motor_vivienda(alc, v):
    c = alc["constantes"]
    H = v.get("altura_muro", 2.4)
    AP = v.get("area_puerta", 1.8)
    AT = float(v.get("area_total", 0))
    P = max(1, int(v.get("numero_pisos", 1)))
    BL = c["bloques_por_m2"]
    DS = 1 + c["desperdicio_pct"] / 100.0
    avisos = []
    q = {}  # cantidades por material

    def suma(nombre, cantidad):
        if cantidad > 0:
            q[nombre] = round(q.get(nombre, 0) + cantidad, 2)

    area_esp = sum_per = muro_caras = muro_pint = 0.0
    puertas = ventanas_m2 = 0.0
    tomas = gfci = luces = extractores = 0
    agua_f = agua_c = desague = 0
    for clave, e in v.get("espacios", {}).items():
        d = alc["espacios"][clave]
        t = d["tipo"]
        n = int(e.get("n", 0))
        if d.get("max1"):
            n = min(n, 1)
        if n <= 0:
            continue
        A = float(e.get("area", 0))
        if A <= 0:
            avisos.append("R003: %s sin area" % clave)
            continue
        if d.get("area_minima") and A < d["area_minima"]:
            avisos.append("Area minima: %s tiene %s m2 (minimo %s)" % (clave, A, d["area_minima"]))
        pu = max(e.get("puertas", 0), 1 if t in ("alcoba", "bano", "salon") else 0)
        ve = e.get("ventanas", 0)
        aw = e.get("an", 0) * e.get("al", 0)
        per = 4 * math.sqrt(A)
        muro = max(0.0, per * H - pu * AP - ve * aw) * n
        area_esp += A * n
        sum_per += per * n
        puertas += pu * n
        ventanas_m2 += ve * aw * n
        luces += n
        if t == "garaje":
            suma("Concreto piso garaje (m3)", A * c["placa_espesor_m"] * n)
            suma("Porton garaje", 1)
            continue
        muro_caras += muro
        if t != "bano":
            muro_pint += muro
        es_cocina = t in ("cocina", "cocina_ropas")
        es_ropas = t in ("ropas", "cocina_ropas")
        if t == "bano":
            gfci += n
            if not ve:
                extractores += n
                avisos.append("Bano sin ventana: extractor")
        elif es_ropas and not es_cocina:
            tomas += n
        else:
            tomas += max(3 if es_cocina else 1, int(round(per / c["tomas_cada_ml_perimetro"]))) * n
        if t == "salon":
            suma("Concreto placa salon (m3)", A * c["placa_espesor_m"] * n)
        else:
            suma("Piso %s (m2)" % clave, A * n * DS)
        if t == "bano":
            pts = min(3, max(1, int(e.get("puntos", 3))))
            aparatos = d["niveles"][str(pts)]
            for x in aparatos + d["accesorios"]:
                suma(x, n)
            suma("Pared banos (m2)", muro * DS)
            suma("Estuco y pintura techo banos (m2)", A * n)
            for x in aparatos:
                if x in ("Sanitario", "Lavamanos", "Ducha"):
                    agua_f += n
                if x == "Ducha":
                    agua_c += n
                desague += n
        if es_cocina:
            suma("Meson de cocina", 1)
            suma("Lavaplatos", 1)
            agua_f += 1
            desague += 1
        if es_ropas:
            suma("Lavadero", 1)
            agua_f += 1
            desague += 1
        if t == "alcoba":
            suma("Closet alcoba", n)

    if AT <= 0:
        avisos.append("R001: falta el area total")
    if AT > 0 and area_esp > AT:
        avisos.append("La suma de los espacios supera el area total")
    if area_esp > 0 and not puertas:
        avisos.append("Toda tipologia debe tener al menos una puerta")

    ap1 = AT / P
    per_ext = 4 * math.sqrt(ap1) * P if AT > 0 else 0
    L = (sum_per + per_ext) / 2  # R005: muros comunes una sola vez
    muro_mamp = max(0.0, L * H - puertas * AP - ventanas_m2)
    fachada = max(0.0, per_ext * H - ventanas_m2 - AP)
    suma("Bloque No 5 (un)", math.ceil(muro_mamp * BL * DS))
    suma("Panete muros interiores (m2)", muro_caras)
    suma("Panete fachada (m2)", fachada)
    suma("Estuco muros (m2)", muro_pint)
    suma("Pintura muros (m2)", muro_pint)
    suma("Pintura fachada (m2)", fachada)
    suma("Puerta", puertas)
    suma("Ventana marco (m2)", ventanas_m2)
    suma("Vidrio transparente (m2)", ventanas_m2)
    suma("Punto agua fria", agua_f)
    suma("Punto agua caliente", agua_c)
    suma("Punto desague", desague)
    suma("Toma electrica", tomas)
    suma("Toma GFCI (bano)", gfci)
    suma("Extractor de bano", extractores)
    suma("Interruptor", luces)
    suma("Luminaria", luces)
    suma("Caja electrica", tomas + gfci + extractores + luces * 2)
    for x in alc["instalaciones"]["electricas"]["fijos"]:
        suma(x, 1)
    if v.get("cubierta", True):
        acub = ap1 * c["factor_cubierta"]
        suma("Teja cubierta (m2)", acub)
        suma("Perfil metalico cubierta (ml)", acub * c["perfil_cubierta_ml_por_m2"])
    tip = tipologia_por_area(alc, AT)
    return {"cantidades": q, "avisos": avisos, "area_espacios": round(area_esp, 2), "muro_mamposteria": round(muro_mamp, 2),
            "categoria_por_area": tip["categoria"] if tip else None}


# --------------------------------------------------------------------------------------------
# Programacion PERT / CPM
# --------------------------------------------------------------------------------------------
def dia_habil(inicio, n, dias_semana=6):
    """Fecha del dia habil n (0 = inicio): salta domingos (y sabados si se trabajan 5 dias)."""
    libre = lambda d: d.weekday() == 6 or (dias_semana <= 5 and d.weekday() == 5)
    d = inicio
    while libre(d):
        d += timedelta(days=1)
    cuenta = 0
    while cuenta < int(n):
        d += timedelta(days=1)
        if not libre(d):
            cuenta += 1
    return d


def programacion(alc, categoria, area_espacios, capitulos=None, inicio=None):
    pr = alc["programacion"]
    tip = next(t for t in alc["tipologias"] if t["categoria"] == categoria)
    K = round(tip["meses"] * pr["semanas_por_mes"] * pr["dias_habiles_semana"])  # constante de tiempo
    pmin, pmax = pr["personas_minimo"], pr["personas_maximo"]
    base = area_espacios / pr["rendimiento_m2_dia_por_espacio"]
    personas = min(pmax, max(pmin, math.ceil(pmin * base / max(1, K))))
    dur_rend = base * pmin / personas
    D = max(K, dur_rend)
    caps = capitulos or [c["n"] for c in alc["capitulos"]]
    presentes = set(caps)

    def prec(n):
        out = []
        for q in pr["precedencias"][str(n)]:
            out += [q] if q in presentes else prec(q)
        return sorted(set(out))

    fo, fp = pr["pert"]["optimista"], pr["pert"]["pesimista"]
    fte = (fo + 4 + fp) / 6.0

    def red(escala):
        t = {}
        for n in caps:
            M = pr["pesos"].get(str(n), 3) * escala
            ps = prec(n)
            es = max([t[q]["ef"] for q in ps] or [0])
            t[n] = {"n": n, "M": M, "O": fo * M, "P": fp * M, "te": fte * M, "sigma": (fp - fo) * M / 6, "prec": ps, "es": es, "ef": es + fte * M}
        return t

    t1 = red(1)
    cp1 = max(x["ef"] for x in t1.values())
    t = red(D / cp1)
    T = max(x["ef"] for x in t.values())
    for n in reversed(caps):
        suc = [x for x in caps if n in t[x]["prec"]]
        t[n]["lf"] = min([t[x]["lf"] - t[x]["te"] for x in suc] or [T])
        t[n]["holgura"] = max(0.0, t[n]["lf"] - t[n]["ef"])
        t[n]["critica"] = t[n]["holgura"] < 0.01
    sigma = math.sqrt(sum(x["sigma"] ** 2 for x in t.values() if x["critica"]))
    inicio = inicio or date.today()
    for x in t.values():
        x["inicio"] = dia_habil(inicio, x["es"], pr["dias_habiles_semana"])
        x["fin"] = dia_habil(inicio, max(x["es"], x["ef"] - 1), pr["dias_habiles_semana"])
    return {"K": K, "dias_rendimiento": base, "personas": personas, "duracion": T, "sigma": sigma, "tareas": [t[n] for n in caps],
            "fin": dia_habil(inicio, max(0, T - 1), pr["dias_habiles_semana"])}


def mano_de_obra(alc, prog):
    m = alc["mano_de_obra"]
    costo_mes = m["SMMLV"] * (1 + m["salud_pct"] + m["arl_pct"]) + m["transporte_dia"] * m["dias_trabajados_mes"]
    costo_dia = costo_mes / m["dias_trabajados_mes"]
    total = prog["personas"] * prog["duracion"] * costo_dia
    suma_te = sum(x["te"] for x in prog["tareas"])
    for x in prog["tareas"]:
        x["mano_de_obra"] = total * x["te"] / suma_te
    return {"costo_dia": costo_dia, "total": total}


def herramientas(alc, prog):
    h = alc["herramientas_alquiler"]["por_capitulo"]
    filas = []
    for x in prog["tareas"]:
        for eq in h.get(str(x["n"]), []):
            dias = max(1, math.ceil(x["te"] * eq["fraccion_uso"]))
            filas.append({"capitulo": x["n"], "herramienta": eq["herramienta"], "cantidad": eq["cantidad"], "dias": dias,
                          "tarifa_dia": eq["tarifa_dia"], "costo": eq["cantidad"] * dias * eq["tarifa_dia"]})
    return {"filas": filas, "total": sum(f["costo"] for f in filas)}


if __name__ == "__main__":
    alc = cargar()
    v = vivienda_de_tipologia(alc, 4, 80)
    r = motor_vivienda(alc, v)
    print("Avisos:", r["avisos"] or "ninguno")
    for k, val in r["cantidades"].items():
        print("  %-38s %10s" % (k, val))
    prog = programacion(alc, v["tipologia"], r["area_espacios"])
    mo = mano_de_obra(alc, prog)
    he = herramientas(alc, prog)
    print("\nConstante K: %d dias habiles | cuadrilla: %d personas | duracion: %.1f dias | fin: %s"
          % (prog["K"], prog["personas"], prog["duracion"], prog["fin"]))
    for x in prog["tareas"]:
        print("  cap %2d  te %5.1f  inicio %5.1f  fin %5.1f  holgura %4.1f %s" % (x["n"], x["te"], x["es"], x["ef"], x["holgura"], "CRITICA" if x["critica"] else ""))
    print("Mano de obra: $%s (dia $%s)" % (format(round(mo["total"]), ","), format(round(mo["costo_dia"]), ",")))
    print("Alquiler de herramientas: $%s" % format(he["total"], ","))
